import { useState, useEffect, useContext, useRef } from "react";
import axios from "axios";
import SuggestionsInput from "./SuggestionsInput.js";
import Link from "./link.ico";
import BrokenLink from "./broken-link.ico";
import { GlobalContext } from "./App.js";
import { API_URL } from "./App.js";

const LinkURL = `url(${Link})`;
const BrokenLinkURL = `url(${BrokenLink})`;

export function InvoiceItem({ ItemsList, setItemsList, setSelectedItemIndex, ExistingQuantities, isQuantitySufficient, Index, ValidationChecker, setValidationChecker}){
  const { ProjectID, StoreID } = useContext(GlobalContext);
  //const [ InitialQuantity, setInitialQuantity ] = useState(ItemsList[Index].Quantity);
  const [ Suggestions, setSuggestions ] = useState([]);
  const [ FilteredSuggestions, setFilteredSuggestions ] = useState([]);
  const [ Chain, setChain ] = useState([false, false, true]);

  const Prices = useRef([]);
  const [ LargePricesSuggestions, setLargePricesSuggestions ] = useState([]);
  const [ SmallPricesSuggestions, setSmallPricesSuggestions ] = useState([]);
  const Item = useRef();

  const suggestProduct = async (NewItemsList) => {
    var RequestParams = {
      RequestType: "SearchProducts",
      ProjectID: ProjectID,
      StoreID: StoreID,
    }
    if (NewItemsList[Index].ProductID){
      RequestParams.Product_ID__Product_ID = NewItemsList[Index].ProductID;
    }
    if (NewItemsList[Index].ProductName){
      RequestParams.Product_ID__Product_Name = NewItemsList[Index].ProductName;
    }
    if (NewItemsList[Index].Trademark){
      RequestParams.Product_ID__Trademark = NewItemsList[Index].Trademark;
    }
    if (NewItemsList[Index].ManufactureCountry){
      RequestParams.Product_ID__Manufacture_Country = NewItemsList[Index].ManufactureCountry;
    }
    await axios.get(API_URL, {params: RequestParams})
      .then((response) => {
        if (!response.data.StatusCode){
          setSuggestions(response.data.Data);
        }else{
          console.log(response.data);
        }
      })
      .catch((error) => console.log(error))
  }
  const suggestPrices = async (NewItemsList) => {
    var RequestParams = {
      RequestType: "SearchProducts",
      ProjectID: ProjectID,
      StoreID: StoreID,
      Product_ID__Product_ID: NewItemsList[Index].ProductID
    }
    await axios.get(API_URL, {params: RequestParams})
      .then((response) => {
        if (!response.data.StatusCode){
          Prices.current = [
            response.data.Data[0].Product_ID__Purchase_Price,
            response.data.Data[0].Product_ID__Wholesale_Price,
            response.data.Data[0].Product_ID__Retail_Price
          ];
          let NewSmallPricesSuggestions = [];
          let NewLargePricesSuggestions = [];
          Prices.current.forEach((price, i) => {
            if (price){
              NewSmallPricesSuggestions.push(
                (i === 0 ? "سعر الشراء: " : (i === 1 ? "سعر بيع الجملة: " : "سعر بيع القطاعي: ")) + price
              );
              NewLargePricesSuggestions.push(
                (i === 0 ? "سعر الشراء: " : (i === 1 ? "سعر بيع الجملة: " : "سعر بيع القطاعي: ")) + (price * NewItemsList[Index].ConversionRate)
              );
            }
          })
          setSmallPricesSuggestions(NewSmallPricesSuggestions);
          setLargePricesSuggestions(NewLargePricesSuggestions);
        }else{
          console.log(response.data);
        }
      })
      .catch((error) => console.log(error))
  }

  const CalculateItemPrices = (NewItemsList) => {
    if (Chain[2]) {
      NewItemsList[Index].Price = +(
        NewItemsList[Index].LargeQuantity * NewItemsList[Index].LargeUnitPrice +
        NewItemsList[Index].SmallQuantity * NewItemsList[Index].SmallUnitPrice
      ).toFixed(2);
    } else if (Chain[1]) {
      let FullQuantity = NewItemsList[Index].LargeQuantity * NewItemsList[Index].ConversionRate + NewItemsList[Index].SmallQuantity;
      NewItemsList[Index].LargeUnitPrice = +(NewItemsList[Index].Price / FullQuantity * NewItemsList[Index].ConversionRate).toFixed(4);
      NewItemsList[Index].SmallUnitPrice = +(NewItemsList[Index].Price / FullQuantity).toFixed(4);
    } else if (Chain[0]) {
      NewItemsList[Index].LargeQuantity = Math.floor(NewItemsList[Index].Price / NewItemsList[Index].LargeUnitPrice);
      NewItemsList[Index].SmallQuantity = NewItemsList[Index].Price % NewItemsList[Index].LargeUnitPrice / NewItemsList[Index].SmallUnitPrice;
    }
    setItemsList(NewItemsList);
  }
  useEffect(() => {
    let NewItemsList = [...ItemsList];
    let MatchedSuggestion = FilteredSuggestions.find(suggestion =>
      suggestion.Product_ID__Product_Name === ItemsList[Index].ProductName &&
      suggestion.Product_ID__Trademark === ItemsList[Index].Trademark &&
      suggestion.Product_ID__Manufacture_Country === ItemsList[Index].ManufactureCountry
    );
    
    if (MatchedSuggestion) {
      NewItemsList[Index] = {
        ...NewItemsList[Index],
        ProductName: MatchedSuggestion.Product_ID__Product_Name,
        ProductID: MatchedSuggestion.Product_ID__Product_ID,
        Trademark: MatchedSuggestion.Product_ID__Trademark,
        ManufactureCountry: MatchedSuggestion.Product_ID__Manufacture_Country,
        LargeQuantityUnit: MatchedSuggestion.Product_ID__Large_Quantity_Unit,
        SmallQuantityUnit: MatchedSuggestion.Product_ID__Small_Quantity_Unit,
        ConversionRate: MatchedSuggestion.Product_ID__Conversion_Rate
      };
      ExistingQuantities[Index] = MatchedSuggestion.Quantity
    }

    setFilteredSuggestions(
      Suggestions.filter(suggestion => 
        !NewItemsList.some(item => item.ProductID === suggestion.Product_ID__Product_ID)
      )
    );
    
    if (
      ItemsList[Index].ProductName !== NewItemsList[Index].ProductName ||
      ItemsList[Index].ProductID !== NewItemsList[Index].ProductID ||
      ItemsList[Index].Trademark !== NewItemsList[Index].Trademark ||
      ItemsList[Index].ManufactureCountry !== NewItemsList[Index].ManufactureCountry ||
      ItemsList[Index].LargeQuantity !== NewItemsList[Index].LargeQuantity ||
      ItemsList[Index].LargeUnitPrice !== NewItemsList[Index].LargeUnitPrice ||
      ItemsList[Index].SmallQuantity !== NewItemsList[Index].SmallQuantity ||
      ItemsList[Index].SmallUnitPrice !== NewItemsList[Index].SmallUnitPrice ||
      ItemsList[Index].Price !== NewItemsList[Index].Price
    ) {
      setItemsList(NewItemsList);
    }
  },[Suggestions]);

  useEffect(() => {
    if (
      ItemsList[Index].ProductID &&
      (ItemsList[Index].LargeQuantity > 0 || ItemsList[Index].SmallQuantity > 0) &&
      ItemsList[Index].LargeUnitPrice &&
      ItemsList[Index].SmallUnitPrice &&
      ItemsList[Index].Price
    ) {
      let NewValidationList = [...ValidationChecker];
      NewValidationList[Index] = true;
      setValidationChecker(NewValidationList);
    } else if (
      !ItemsList[Index].ProductName &&
      !ItemsList[Index].Trademark &&
      !ItemsList[Index].ManufactureCountry &&
      !ItemsList[Index].LargeQuantity &&
      !ItemsList[Index].SmallQuantity &&
      !ItemsList[Index].LargeUnitPrice &&
      !ItemsList[Index].SmallUnitPrice &&
      !ItemsList[Index].Price
    ) {
      let NewValidationList = [...ValidationChecker];
      NewValidationList[Index] = undefined;
      setValidationChecker(NewValidationList);
    } else {
      let NewValidationList = [...ValidationChecker];
      NewValidationList[Index] = false;
      setValidationChecker(NewValidationList);
    }
  }, [ItemsList[Index]]);


  return(
    <tr ref={Item}>
      <td>{Index+1}</td>
      <td>
        <SuggestionsInput Type="text" Value={ItemsList[Index].ProductName}
          Suggestions={FilteredSuggestions.map(suggestion => suggestion.Product_ID__Product_Name + " - " + suggestion.Product_ID__Trademark + " - " + suggestion.Product_ID__Manufacture_Country + " - الكمية الموجودة: " + suggestion.Quantity)}
          Disabled={Index > 0 ? !ValidationChecker[Index - 1]: false}
          onFocus={() => {
            setSelectedItemIndex(Index);
          }}
          onChange={(event) => {
            let NewItemsList = [...ItemsList];
            NewItemsList[Index] = {
              ...NewItemsList[Index],
              ProductID: "",
              LargeQuantityUnit: "",
              SmallQuantityUnit: "",
              ConversionRate: "",
              ProductName: event.target.value
            };
            ExistingQuantities[Index] = undefined;
            Prices.current = [];
            setSmallPricesSuggestions([]);
            setLargePricesSuggestions([]);
            setItemsList(NewItemsList);
            suggestProduct(NewItemsList);

          }}
          onSelect={(index) => {
            let NewItemsList = [...ItemsList];
            NewItemsList[Index] = {
              ...NewItemsList[Index],
              ProductName: FilteredSuggestions[index].Product_ID__Product_Name,
              ProductID: FilteredSuggestions[index].Product_ID__Product_ID,
              Trademark: FilteredSuggestions[index].Product_ID__Trademark,
              ManufactureCountry: FilteredSuggestions[index].Product_ID__Manufacture_Country,
              LargeQuantityUnit: FilteredSuggestions[index].Product_ID__Large_Quantity_Unit,
              SmallQuantityUnit: FilteredSuggestions[index].Product_ID__Small_Quantity_Unit,
              ConversionRate: FilteredSuggestions[index].Product_ID__Conversion_Rate
            };
            setItemsList(NewItemsList);
            ExistingQuantities[Index] = FilteredSuggestions[index].Quantity;
          }}
        />
      </td>
      <td>
        <SuggestionsInput Type="text" Value={ItemsList[Index].Trademark}
          Suggestions={FilteredSuggestions.map(suggestion => suggestion.Product_ID__Product_Name + " - " + suggestion.Product_ID__Trademark + " - " + suggestion.Product_ID__Manufacture_Country + " - الكمية الموجودة: " + suggestion.Quantity)}
          Disabled={Index > 0 ? !ValidationChecker[Index - 1]: false}
          onFocus={() => {
            setSelectedItemIndex(Index);
          }}
          onChange={(event) => {
            let NewItemsList = [...ItemsList];
            NewItemsList[Index] = {
              ...NewItemsList[Index],
              ProductID: "",
              LargeQuantityUnit: "",
              SmallQuantityUnit: "",
              ConversionRate: "",
              Trademark: event.target.value
            };
            ExistingQuantities[Index] = undefined;
            Prices.current = [];
            setSmallPricesSuggestions([]);
            setLargePricesSuggestions([]);
            setItemsList(NewItemsList);
            suggestProduct(NewItemsList);

          }}
          onSelect={(index) => {
            let NewItemsList = [...ItemsList];
            NewItemsList[Index] = {
              ...NewItemsList[Index],
              ProductName: FilteredSuggestions[index].Product_ID__Product_Name,
              ProductID: FilteredSuggestions[index].Product_ID__Product_ID,
              Trademark: FilteredSuggestions[index].Product_ID__Trademark,
              ManufactureCountry: FilteredSuggestions[index].Product_ID__Manufacture_Country,
              LargeQuantityUnit: FilteredSuggestions[index].Product_ID__Large_Quantity_Unit,
              SmallQuantityUnit: FilteredSuggestions[index].Product_ID__Small_Quantity_Unit,
              ConversionRate: FilteredSuggestions[index].Product_ID__Conversion_Rate
            };
            setItemsList(NewItemsList);
            ExistingQuantities[Index] = FilteredSuggestions[index].Quantity;
          }}
        />
      </td>
      <td>
        <SuggestionsInput Type="text" Value={ItemsList[Index].ManufactureCountry}
          Suggestions={FilteredSuggestions.map(suggestion => suggestion.Product_ID__Product_Name + " - " + suggestion.Product_ID__Trademark + " - " + suggestion.Product_ID__Manufacture_Country + " - الكمية الموجودة: " + suggestion.Quantity)}
          Disabled={Index > 0 ? !ValidationChecker[Index - 1]: false}
          onFocus={() => {
            setSelectedItemIndex(Index);
          }}
          onChange={(event) => {
            let NewItemsList = [...ItemsList];
            NewItemsList[Index] = {
              ...NewItemsList[Index],
              ProductID: "",
              LargeQuantityUnit: "",
              SmallQuantityUnit: "",
              ConversionRate: "",
              ManufactureCountry: event.target.value
            };
            ExistingQuantities[Index] = undefined;
            Prices.current = [];
            setSmallPricesSuggestions([]);
            setLargePricesSuggestions([]);
            setItemsList(NewItemsList);
            suggestProduct(NewItemsList);

          }}
          onSelect={(index) => {
            let NewItemsList = [...ItemsList];
            NewItemsList[Index] = {
              ...NewItemsList[Index],
              ProductName: FilteredSuggestions[index].Product_ID__Product_Name,
              ProductID: FilteredSuggestions[index].Product_ID__Product_ID,
              Trademark: FilteredSuggestions[index].Product_ID__Trademark,
              ManufactureCountry: FilteredSuggestions[index].Product_ID__Manufacture_Country,
              LargeQuantityUnit: FilteredSuggestions[index].Product_ID__Large_Quantity_Unit,
              SmallQuantityUnit: FilteredSuggestions[index].Product_ID__Small_Quantity_Unit,
              ConversionRate: FilteredSuggestions[index].Product_ID__Conversion_Rate
            };
            setItemsList(NewItemsList);
            ExistingQuantities[Index] = FilteredSuggestions[index].Quantity;
          }}
        />
      </td>
      <td>
        <input
          type="text"
          value={ItemsList[Index].ProductID}
          onFocus={() => {
            setSelectedItemIndex(Index);
          }}
          readOnly
        />
      </td>
      <td>
        <input type="number" value={ItemsList[Index].LargeQuantity}
          placeholder={ExistingQuantities[Index] !== undefined && "الكمية الموجودة " + Math.floor(ExistingQuantities[Index] / ItemsList[Index].ConversionRate)}
          disabled={Chain[0] || (Index > 0 ? !ValidationChecker[Index - 1]: false)}
          className={
            isQuantitySufficient ? "" : "Invalid-field-data"
          }
          onFocus={() => {
            setSelectedItemIndex(Index);
          }}
          onChange={(event) => {
            isQuantitySufficient = true
            let NewItemsList = [...ItemsList];
            NewItemsList[Index] = {
              ...NewItemsList[Index],
              LargeQuantity: event.target.value,
            };
            CalculateItemPrices(NewItemsList);
          }} 
        />
        <button className="Field-lock" 
          style={
            {
              display: (Index > 0 ? !ValidationChecker[Index - 1] && "none" : ""),
              backgroundImage: Chain[0] ? LinkURL : BrokenLinkURL
            }
          }
          onClick={() => {
            Chain[0] ? setChain([false, true, false]): setChain([true, false, false]);
          }}></button>
      </td>
      <td>
        <input type="text" value={ItemsList[Index].LargeQuantityUnit}
          onFocus={() => {
            setSelectedItemIndex(Index);
          }}
          disabled={Index > 0 ? !ValidationChecker[Index - 1]: false}
          readOnly
        />
      </td>
      <td>
        <SuggestionsInput Type="number" Value={ItemsList[Index].LargeUnitPrice}
          Suggestions={LargePricesSuggestions}
          onFocus={() => {
            setSelectedItemIndex(Index);
            if (ItemsList[Index].ProductID)
              suggestPrices(ItemsList);
            else{
              Prices.current = [];
              setLargePricesSuggestions([]);
              setSmallPricesSuggestions([]);
            }
          }}
          onChange={(event) => {
            let Value = +parseFloat(event.target.value).toFixed(4);
            let NewItemsList = [...ItemsList];
            NewItemsList[Index] = {
              ...NewItemsList[Index],
              LargeUnitPrice: Value,
              SmallUnitPrice: Value / NewItemsList[Index].ConversionRate,
            };
            CalculateItemPrices(NewItemsList);
          }}
          onSelect={(index) => {
            let NewItemsList = [...ItemsList];
            NewItemsList[Index] = {
              ...NewItemsList[Index],
              LargeUnitPrice: Prices.current[index] * NewItemsList[Index].ConversionRate,
              SmallUnitPrice: Prices.current[index],
            };
            CalculateItemPrices(NewItemsList);
          }}
          Disabled={Chain[1] || (Index > 0 ? !ValidationChecker[Index - 1]: false)}
        />
        <button className="Field-lock" 
          style={
            {
              display: (Index > 0 ? !ValidationChecker[Index - 1] && "none" : ""),
              backgroundImage: Chain[1] ? LinkURL : BrokenLinkURL
            }
          }
          onClick={() => {
            Chain[1] ? setChain([true, false, false]): setChain([false, true, false]);
          }}></button>
      </td>
      <td>
        <input type="number" value={ItemsList[Index].SmallQuantity}
          placeholder={ExistingQuantities[Index] !== undefined && "الكمية الموجودة " + (ExistingQuantities[Index] % ItemsList[Index].ConversionRate)}
          disabled={Chain[0] || (Index > 0 ? !ValidationChecker[Index - 1]: false)}
          className={
            isQuantitySufficient ? "" : "Invalid-field-data"
          }
          onFocus={() => {
            setSelectedItemIndex(Index);
          }}
          onChange={(event) => {
            isQuantitySufficient = true
            let NewItemsList = [...ItemsList];
            NewItemsList[Index] = {
              ...NewItemsList[Index],
              SmallQuantity: event.target.value,
            };
            CalculateItemPrices(NewItemsList);
          }} 
        />
        <button className="Field-lock" 
          style={
            {
              display: (Index > 0 ? !ValidationChecker[Index - 1] && "none" : ""),
              backgroundImage: Chain[0] ? LinkURL : BrokenLinkURL
            }
          }
          onClick={() => {
            Chain[0] ? setChain([false, true, false]): setChain([true, false, false]);
          }}></button>
      </td>
      <td>
        <input type="text" value={ItemsList[Index].SmallQuantityUnit}
          onFocus={() => {
            setSelectedItemIndex(Index);
          }}
          disabled={Index > 0 ? !ValidationChecker[Index - 1]: false}
          readOnly
        />
      </td>
      <td>
        <SuggestionsInput Type="number" Value={ItemsList[Index].SmallUnitPrice}
          Suggestions={SmallPricesSuggestions}
          onFocus={() => {
            setSelectedItemIndex(Index);
            if (ItemsList[Index].ProductID)
              suggestPrices(ItemsList);
            else{
              Prices.current = [];
              setLargePricesSuggestions([]);
              setSmallPricesSuggestions([]);
            }
          }}
          onChange={(event) => {
            let NewItemsList = [...ItemsList];
            NewItemsList[Index] = {
              ...NewItemsList[Index],
              SmallUnitPrice: +parseFloat(event.target.value).toFixed(4),
              LargeUnitPrice: +parseFloat(event.target.value * NewItemsList[Index].ConversionRate),
            };
            CalculateItemPrices(NewItemsList);
          }}
          onSelect={(index) => {
            let NewItemsList = [...ItemsList];
            NewItemsList[Index] = {
              ...NewItemsList[Index],
              SmallUnitPrice: Prices.current[index],
              LargeUnitPrice: Prices.current[index] * NewItemsList[Index].ConversionRate,
            };
            CalculateItemPrices(NewItemsList);
          }}
          Disabled={Chain[1] || (Index > 0 ? !ValidationChecker[Index - 1]: false)}
        />
        <button className="Field-lock"
          style={
            {
              display: (Index > 0 ? !ValidationChecker[Index - 1] && "none" : ""),
              backgroundImage: Chain[1] ? LinkURL : BrokenLinkURL
            }
          }
          onClick={() => {
            Chain[1] ? setChain([true, false, false]): setChain([false, true, false]);
          }}></button>
      </td>
      <td>
        <input type="number" value={ItemsList[Index].Price}
          onFocus={() => {
            setSelectedItemIndex(Index);
          }}
          onChange={(event) => {
            let NewItemsList = [...ItemsList];
            NewItemsList[Index] = {
              ...NewItemsList[Index],
              Price: +parseFloat(event.target.value).toFixed(2),
            };
            CalculateItemPrices(NewItemsList);
          }}
          disabled={Chain[2] || (Index > 0 ? !ValidationChecker[Index - 1]: false)}
        />
        <button className="Field-lock" 
          style={
            {
              display: (Index > 0 ? !ValidationChecker[Index - 1] && "none" : ""),
              backgroundImage: Chain[2] ? LinkURL : BrokenLinkURL
            }
          }
          onFocus={() => {
            setSelectedItemIndex(Index);
          }}
          onClick={() => {
            Chain[2] ? setChain([false, true, false]): setChain([false, false, true]);
          }}></button>
      </td>
    </tr>
  )
}

export function TransitionDocumentItem({ItemsList, setItemsList, setSelectedItemIndex, Index, ExistingQuantities, isQuantitySufficient, ValidationChecker, setValidationChecker}){
  const { ProjectID } = useContext(GlobalContext);
  const { StoreID } = useContext(GlobalContext);
  
  const [ Suggestions, setSuggestions ] = useState([]);
  const [ FilteredSuggestions, setFilteredSuggestions ] = useState([]);

  const Item = useRef();

  const suggestProduct = async (NewItemsList) => {
    var RequestParams = {
      RequestType: "SearchProducts",
      ProjectID: ProjectID,
      StoreID: StoreID,
    }
    if (NewItemsList[Index].ProductName){
      RequestParams.Product_ID__Product_Name = NewItemsList[Index].ProductName;
    }
    if (NewItemsList[Index].Trademark){
      RequestParams.Product_ID__Trademark = NewItemsList[Index].Trademark;
    }
    if (NewItemsList[Index].ManufactureCountry){
      RequestParams.Product_ID__Manufacture_Country = NewItemsList[Index].ManufactureCountry;
    }
    await axios.get(API_URL, {params: RequestParams})
      .then((response) => {
        if (!response.data.StatusCode){
          setSuggestions(response.data.Data);
        }else{
          console.log(response.data);
        }
      })
      .catch((error) => console.log(error))
  }


  useEffect(() => {
    let NewItemsList = [...ItemsList];
    let MatchedSuggestion = Suggestions.find(suggestion =>
      suggestion.Product_ID__Product_Name === ItemsList[Index].ProductName &&
      suggestion.Product_ID__Trademark === ItemsList[Index].Trademark &&
      suggestion.Product_ID__Manufacture_Country === ItemsList[Index].ManufactureCountry
    )
    if (MatchedSuggestion) {
      NewItemsList[Index] = {
        ...NewItemsList[Index],
        ProductName: MatchedSuggestion.Product_ID__Product_Name,
        ProductID: MatchedSuggestion.Product_ID__Product_ID,
        Trademark: MatchedSuggestion.Product_ID__Trademark,
        ManufactureCountry: MatchedSuggestion.Product_ID__Manufacture_Country,
        LargeQuantityUnit: MatchedSuggestion.Product_ID__Quantity_Unit,
        SmallQuantityUnit: MatchedSuggestion.Product_ID__Small_Quantity_Unit,
        ConversionRate: MatchedSuggestion.Product_ID__Conversion_Rate
      };
      ExistingQuantities[Index] = MatchedSuggestion.Quantity
    }
    setFilteredSuggestions(
      Suggestions.filter(suggestion => 
        !NewItemsList.some(item => item.ProductID === suggestion.Product_ID__Product_ID)
      )
    );

    if (
      ItemsList[Index].ProductName !== NewItemsList[Index].ProductName ||
      ItemsList[Index].ProductID !== NewItemsList[Index].ProductID ||
      ItemsList[Index].Trademark !== NewItemsList[Index].Trademark ||
      ItemsList[Index].ManufactureCountry !== NewItemsList[Index].ManufactureCountry ||
      ItemsList[Index].LargeQuantity !== NewItemsList[Index].LargeQuantity,
      ItemsList[Index].SmallQuantity !== NewItemsList[Index].SmallQuantity
    ) {
      setItemsList(NewItemsList);
    }
  },[Suggestions]);

  useEffect(() => {
    if ( ItemsList[Index].ProductID && ItemsList[Index].LargeQuantity && ItemsList[Index].SmallQuantity) {
      let NewValidationList = [...ValidationChecker];
      NewValidationList[Index] = true;
      setValidationChecker(NewValidationList);
      
    } else if (
      !ItemsList[Index].ProductName && !ItemsList[Index].Trademark && !ItemsList[Index].ManufactureCountry
      && !ItemsList[Index].LargeQuantity && !ItemsList[Index].SmallQuantity
    ) {
      let NewItemsList = [...ItemsList];
      NewItemsList[Index] = {
        ProductName: "",
        ProductID: "",
        Trademark: "",
        ManufactureCountry: "",
        LargeQuantityUnit: "",
        SmallQuantityUnit: "",
        ConversionRate: "",
        LargeQuantity: ""
      };
      let NewValidationList = [...ValidationChecker];
      NewValidationList[Index] = undefined;
      setValidationChecker(NewValidationList);
    } else {
      let NewValidationList = [...ValidationChecker];
      NewValidationList[Index] = false;
      setValidationChecker(NewValidationList);
    }
  }, [ItemsList[Index]]);
  
  return(
    <tr ref={Item}>
      <td>{Index+1}</td>
      <td>
        <SuggestionsInput Type="text" Value={ItemsList[Index].ProductName}
          Suggestions={FilteredSuggestions.map(suggestion => suggestion.Product_ID__Product_Name + " - " + suggestion.Product_ID__Trademark + " - " + suggestion.Product_ID__Manufacture_Country)}
          Disabled={Index > 0 ? !ValidationChecker[Index - 1]: false}
          onFocus={() => {
            setSelectedItemIndex(Index);
          }}
          onChange={(event) => {
            let NewItemsList = [...ItemsList];
            NewItemsList[Index] = {
              ...NewItemsList[Index],
              ProductID: "",
              LargeQuantityUnit: "",
              SmallQuantityUnit: "",
              ConversionRate: "",
              ProductName: event.target.value
            };
            ExistingQuantities[Index] = undefined;
            setItemsList(NewItemsList);
            suggestProduct(NewItemsList);
          }}
          onSelect={(index) => {
            let NewItemsList = [...ItemsList];
            NewItemsList[Index] = {
              ...NewItemsList[Index],
              ProductName: FilteredSuggestions[index].Product_ID__Product_Name,
              ProductID: FilteredSuggestions[index].Product_ID__Product_ID,
              Trademark: FilteredSuggestions[index].Product_ID__Trademark,
              ManufactureCountry: FilteredSuggestions[index].Product_ID__Manufacture_Country,
              LargeQuantityUnit: FilteredSuggestions[index].Product_ID__Large_Quantity_Unit,
              SmallQuantityUnit: FilteredSuggestions[index].Product_ID__Small_Quantity_Unit,
              ConversionRate: FilteredSuggestions[index].Product_ID__Conversion_Rate
            };
            setItemsList(NewItemsList);
            ExistingQuantities[Index] = FilteredSuggestions[index].Quantity;
          }}
        />
      </td>
      <td>
        <SuggestionsInput Type="text" Value={ItemsList[Index].Trademark}
          Suggestions={FilteredSuggestions.map(suggestion => suggestion.Product_ID__Product_Name + " - " + suggestion.Product_ID__Trademark + " - " + suggestion.Product_ID__Manufacture_Country)}
          Disabled={Index > 0 ? !ValidationChecker[Index - 1]: false}
          onFocus={() => {
            setSelectedItemIndex(Index);
          }}
          onChange={(event) => {
            let NewItemsList = [...ItemsList];
            NewItemsList[Index] = {
              ...NewItemsList[Index],
              ProductID: "",
              LargeQuantityUnit: "",
              SmallQuantityUnit: "",
              ConversionRate: "",
              Trademark: event.target.value
            };
            ExistingQuantities[Index] = undefined;
            setItemsList(NewItemsList);
            suggestProduct();
          }}
          onSelect={(index) => {
            let NewItemsList = [...ItemsList];
            NewItemsList[Index] = {
              ...NewItemsList[Index],
              ProductName: FilteredSuggestions[index].Product_ID__Product_Name,
              ProductID: FilteredSuggestions[index].Product_ID__Product_ID,
              Trademark: FilteredSuggestions[index].Product_ID__Trademark,
              ManufactureCountry: FilteredSuggestions[index].Product_ID__Manufacture_Country,
              LargeQuantityUnit: FilteredSuggestions[index].Product_ID__Large_Quantity_Unit,
              SmallQuantityUnit: FilteredSuggestions[index].Product_ID__Small_Quantity_Unit,
              ConversionRate: FilteredSuggestions[index].Product_ID__Conversion_Rate
            };
            setItemsList(NewItemsList);
            ExistingQuantities[Index] = FilteredSuggestions[index].Quantity;
          }}
        />
      </td>
      <td>
        <SuggestionsInput Type="text" Value={ItemsList[Index].ManufactureCountry}
          Suggestions={FilteredSuggestions.map(suggestion => suggestion.Product_ID__Product_Name + " - " + suggestion.Product_ID__Trademark + " - " + suggestion.Product_ID__Manufacture_Country)}
          Disabled={Index > 0 ? !ValidationChecker[Index - 1]: false}
          onFocus={() => {
            setSelectedItemIndex(Index);
          }}
          onChange={(event) => {
            let NewItemsList = [...ItemsList];
            NewItemsList[Index] = {
              ...NewItemsList[Index],
              ProductID: "",
              LargeQuantityUnit: "",
              SmallQuantityUnit: "",
              ConversionRate: "",
              ManufactureCountry: event.target.value
            };
            ExistingQuantities[Index] = undefined;
            setItemsList(NewItemsList);
            suggestProduct();
          }}
          onSelect={(index) => {
            let NewItemsList = [...ItemsList];
            NewItemsList[Index] = {
              ...NewItemsList[Index],
              ProductName: FilteredSuggestions[index].Product_ID__Product_Name,
              ProductID: FilteredSuggestions[index].Product_ID__Product_ID,
              Trademark: FilteredSuggestions[index].Product_ID__Trademark,
              ManufactureCountry: FilteredSuggestions[index].Product_ID__Manufacture_Country,
              LargeQuantityUnit: FilteredSuggestions[index].Product_ID__Large_Quantity_Unit,
              SmallQuantityUnit: FilteredSuggestions[index].Product_ID__Small_Quantity_Unit,
              ConversionRate: FilteredSuggestions[index].Product_ID__Conversion_Rate
            };
            setItemsList(NewItemsList);
            ExistingQuantities[Index] = FilteredSuggestions[index].Quantity;
          }}
        />
      </td>
      <td>
        <input
          type="text"
          value={ItemsList[Index].ProductID}
          onFocus={() => {
            setSelectedItemIndex(Index);
          }}
          disabled={Index > 0 ? !ValidationChecker[Index - 1]: false}
          readOnly
        />
      </td>
      <td>
        <input type="number" value={ItemsList[Index].LargeQuantity}
          placeholder={ExistingQuantities[Index] !== undefined && "الكمية الموجودة "+ExistingQuantities[Index]}
          className={ 
            isQuantitySufficient ? "" : "Invalid-field-data"
          }
          disabled={Index > 0 ? !ValidationChecker[Index - 1]: false}
          onFocus={() => {
            setSelectedItemIndex(Index);
          }}
          onChange={(event) => {
            let Value = event.target.value;
            let NewItemsList = [...ItemsList];
            NewItemsList[Index] = {
              ...NewItemsList[Index],
              LargeQuantity: Value,
            };
            setItemsList(NewItemsList);
          }} 
        />
      </td>
      <td>
        <input type="text" value={ItemsList[Index].LargeQuantityUnit}
          onFocus={() => {
            setSelectedItemIndex(Index);
          }}
          readOnly
        />
      </td>
      <td>
        <input type="number" value={ItemsList[Index].SmallQuantity}
          disabled={Index > 0 ? !ValidationChecker[Index - 1]: false}
          onFocus={() => {
            setSelectedItemIndex(Index);
          }}
          onChange={(event) => {
            let Value = event.target.value;
            let NewItemsList = [...ItemsList];
            NewItemsList[Index] = {
              ...NewItemsList[Index],
              SmallQuantity: Value,
            };
            setItemsList(NewItemsList);
          }} 
        />
      </td>
      <td>
        <input type="text" value={ItemsList[Index].SmallQuantityUnit}
          onFocus={() => {
            setSelectedItemIndex(Index);
          }}
          readOnly
        />
      </td>
    </tr>
  )
}
